import fs from 'fs';
import Checklist from 'checklist-js';
import assemble_url from './utils/assemble_url.js';
import clean from './utils/clean.js';
import Storage from 'storing-me';
import ProxyRotator from 'proxy-rotator-js'
import axios from 'axios';
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

// get which cedulas we are reading from
let cedula_prefix = process.argv[2];
// let get the phone number from the params passed
console.log('reading cedulas starting with: ', cedula_prefix);
if(!cedula_prefix){
    console.log('Please enter a number from 01 - 24 or 30');
    process.exit(1);
}

// create proxy rotator
let proxies = new ProxyRotator('./storage/proxies/proxyscrape_premium_http_proxies.txt', { 
    shuffle: true 
})
let proxy = proxies.next();
console.log('using proxy: ', proxy);
//  make axios with proxy
let axios = axios_raw.create({
    proxy: {
        host: proxy.split(':')[0],
        port: proxy.split(':')[1],
        protocol: 'http'
    }
});

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
});

// get new cedula
let cedula = checklist.next();

while (cedula) {
    console.log('scrapping cedula: ', cedula);

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

    // save cedula data   
    await store.set(cedula, cedulaData);
    // mark cedula as done
    checklist.check(cedula);
    // log 
    console.log(cedulaData);
    console.log(`cedula ${cedula} checked, ${checklist._values.length}/${checklist.missingLeft()} left`);
    // get new cedula
    cedula = checklist.next();
}


// save cedula
// send cedula to: slave
//while (cedula) {
/*
    let slave = await master.getIdle();
    // run the slave with the cedula and proxy
    let result = slave.run({ 
        proxy: proxies.next(),
        cedula: checklist.next(),
    }).then( async ({ cedula, data }) =>  {
        console.log(`${cedula}: `, data);
        // save data
        await store.setValue(cedula, data);
        // mark cedula as done
        checklist.check(cedula);
        console.log(`cedula ${cedula} checked, ${checklist._values.length}/${checklist.missingLeft()} left`);
    }).catch( error => { console.log(`${cedula}: `, error); });
}

// make eqeust to get cookie and javax.faces.ViewState
let response = await axios.get(domain);

// get the javax.faces.ViewState
let javax_faces_ViewState = response.data
    .match(/id="j_id1:javax.faces.ViewState:0" value="(.*)"/)[1]    
    .split('"')[0]
    .trim();

// solve captchan
let token = await captchanSolver(domain, siteKey, process.env.CAPTCHA_SOLVER_API_KEY, { 
    debug: false,
    proxy: proxy,
    proxytype: 'http'
});

// genreate fake proxy
//let token = generateToken();

let postData = {
    'frmBusquedaPublica': "frmBusquedaPublica",
    'frmBusquedaPublica:txtCedula':	cedula,
    'g-recaptcha-response':	token,
    'frmBusquedaPublica:btnBuscar':	"",
    'javax.faces.ViewState': javax_faces_ViewState,
}

response = await axios.post(domain, postData, {
    headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Cookie': response.headers['set-cookie'][0],
    },
    //proxy: proxies.next(),
});

let data = parseTables(response.data);
// if there was an 
if( data.data  === 'Para conocer si te encuentras registrado en la base de datos del Registro Social, ingresa tu número de cédula:' )
    throw new Error('could not get cedula');
    */

