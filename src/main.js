import fs from 'fs';
import Checklist from 'checklist-js';
import assemble_url from './utils/assemble_url.js';
import clean from './utils/clean.js';
import Storage from 'storing-me';
import ProxyRotator from 'proxy-rotator-js'
import axios_raw from 'axios';
import slavery from 'slavery-js';
import parseCedula from './parsers/parseCedula.js';
import parseEstado from './parsers/parseEstado.js';

// domain
let domain = 'https://consultaweb.ant.gob.ec';
// file path
let path_grid = '/PortalWEB/paginas/clientes/clp_grid_citaciones.jsp';
let path_json = '/PortalWEB/paginas/clientes/clp_json_citaciones.jsp';
let puntos_path_json = '/PortalWEB/paginas/clientes/clp_json_puntos.jsp';
let estado_de_cuenta = '/PortalWEB/paginas/clientes/clp_estado_cuenta.jsp'; 

slavery({
    host: 'localhost', // '192.168.50.239',
    port : 3005,
    numberOfSlaves: 100,
}).master( async master => {
    // get which cedulas we are reading from
    let cedula_prefix = process.argv[2];
    // let get the phone number from the params passed
    console.log('reading cedulas starting with: ', cedula_prefix);
    if(!cedula_prefix){
        console.log('Please enter a number from 01 - 24 or 30');
        process.exit(1);
    }
    // create proxy rotator
    let proxies = new ProxyRotator('./storage/proxies/proxyscrape_premium_http_proxies.txt');

    // make storage
    let storage = new Storage({
        type: 'json', // sqlite, csv, ..etc
        keyValue: true,
        path: './storage/cedulas/'
    });
    let store = await storage.open(`cedulas_${cedula_prefix}`);

    // read cedulas
    let cedulas = fs
        .readFileSync(`./storage/cedulas/cedulas_${cedula_prefix}.txt`, 'utf8')
        .split('\n');

    // make directory
    fs.mkdirSync(`./storage/checklist/cedulas_${cedula_prefix}`, { recursive: true });
    // create checklist
    let checklist = new Checklist(cedulas, { 
        path: `./storage/checklist/cedulas_${cedula_prefix}`,
		recalc_on_check: false,
    });

    // get new cedula
    let cedula = checklist.next();

    // loop through cedulas
    while (cedula) {
        // get slave
        let slave = await master.getIdle();
        let result = slave.run({ 
            proxy: proxies.next(),
            cedula: checklist.next(),
        }).then( async ({ cedula, data }) =>  {
            console.log(`${cedula}: `, data);
            // save data
            await store.set(cedula, data);
            // mark cedula as done
            checklist.check(cedula);
            // if any ticket type has more than 50 tickets, stop
            // loop through ticket types
            Object.keys(data.tickets).forEach( type => {
                if(data.tickets[type].rows.length > 50){
                        console.log(`found ${data.tickets[type].rows.length} ${type} tickets`);
                        console.log(cedulaData)
                        master.exit();
                }
            });
            console.log(`cedula ${cedula} checked, ${checklist._values.length}/${checklist._missing_values.length} left`);
        }).catch( error => { console.log(`${cedula}: `, error); });
    }
}).slave( async ({ proxy, cedula }, slave ) => {
    console.log(`scrapping cedula ${cedula} with proxy ${proxy}`);
    //  make axios with proxy
    let axios = axios_raw.create({
        proxy: {
            host: proxy.split(':')[0],
            port: proxy.split(':')[1],
            protocol: 'http'
        }
    });
    // get cedula data
    let res = await axios.get( 
        assemble_url( domain + path_grid, {
            'ps_tipo_identificacion': 'CED',
            'ps_identificacion': cedula
        })
    );
    let cedulaData = parseCedula(res.data);
    // get estado de cuenta
    res = await axios.get(
        assemble_url( domain + estado_de_cuenta, {
            'ps_persona': cedulaData.id_persona,
            'ps_id_contrato': '',
            'ps_opcion': 'P',
            'ps_identificacion': cedula,
            'ps_tipo_identificacion': 'CED',
            'ps_placa': '',
        })
    );
    cedulaData['estado_de_cuenta'] = parseEstado(res.data);
    // get all ticket data
    cedulaData['tickets'] = {};
    let ticketTypes = {
        'P' : 'pendientes',
        'R' : 'en inputacion',
        'A' : 'Anuladas',
        'G' : 'pagadas',
        'C' : 'en convenio'
    };
    for (let type in ticketTypes) {
        let url = assemble_url( domain + path_json, {
            'ps_opcion' : type,
            'ps_id_contrato' : '',
            'ps_id_persona' : cedulaData.id_persona,
            'ps_placa' : '',
            'ps_identificacion' : cedula,
            'ps_tipo_identificacion' : 'CED',
            '_search' : 'false',
            'nd' : '1699970748700',// this does nothing
            'rows' : '50',
            'page' : '1',
            'sidx' : 'fecha_emision',
            'sord' : 'desc'
        })
        let tickets = await axios.get(url);
        cedulaData['tickets'][ticketTypes[type]] = tickets.data;
        if(tickets.data.rows.length > 50){
            console.log(`found ${tickets.data.rows.length} ${ticketTypes[type]} tickets`);
            console.log(cedulaData)
            break;
        }

    }
    // get points history
    let url = assemble_url( domain + puntos_path_json, {
        'ps_opcion' : 'P',
        'ps_id_persona' : cedulaData.id_persona,
        'ps_id_empresa' : '01',
        '_search' : 'false',
        'nd' : '1699970748700',// this does nothing
        'rows' : '50',
        'page' : '1',
        'sidx' : 'fecha_emision',
        'sord' : 'desc'
    })
    let points_history = await axios.get(url);
    cedulaData['points_history'] = clean(points_history.data);
    // return the scraped data
    return { cedula, data: cedulaData };
})

