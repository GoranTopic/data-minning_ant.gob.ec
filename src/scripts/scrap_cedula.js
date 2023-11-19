import axios_raw from 'axios';
import fs from 'fs';
import clean from '../utils/clean.js';
import assemble_url from '../utils/assemble_url.js';
import parseCedula from '../parsers/parseCedula.js';
import parseEstado from '../parsers/parseEstado.js';

'https://consultaweb.ant.gob.ec/PortalWEB/paginas/clientes/clp_grid_citaciones.jsp?ps_tipo_identificacion=CED&ps_identificacion=0106128374&ps_placa='
// domain
let domain = 'https://consultaweb.ant.gob.ec';
// file path
let path_grid = '/PortalWEB/paginas/clientes/clp_grid_citaciones.jsp';
let path_json = '/PortalWEB/paginas/clientes/clp_json_citaciones.jsp';
let puntos_path_json = '/PortalWEB/paginas/clientes/clp_json_puntos.jsp';
let estado_de_cuenta = '/PortalWEB/paginas/clientes/clp_estado_cuenta.jsp'; 
let consulta_pesona = '/PortalWEB/paginas/clientes/clp_json_consulta_persona.jsp'; 


/**
 * Scrapes data for a given cedula (identification number) from a website.
 * 
 * @param {string} cedula - The cedula to scrape data for.
 * @param {object} options - Additional options for scraping.
 * @param {object} options.proxy - The proxy configuration to use for the request.
 * @returns {Promise<object>} - A promise that resolves to the scraped cedula data.
 */
const scap_cedula = async (cedula, { proxy } = {}) => {
    // if proxy is passed use it
    proxy = proxy || null;
    let axios = proxy ? axios_raw.create({
        proxy: {
            host: proxy.split(':')[0],
            port: proxy.split(':')[1],
            protocol: 'http'
        }
    }) : axios_raw;

    // check if cedula is in db
    let url = assemble_url(domain + consulta_pesona, {
        'ps_tipo_identificacion': 'CED',
        'ps_identificacion': cedula
    })
    let res = await axios.get(url);

    // check if cedula is in db
    if (res.data.mensaje === 'No se encontró registro en el Sistema') {
        return { data: 'No se encontró registro en el Sistema' };
    }

    // if cedula is not in db return
    url = assemble_url(domain + path_grid, {
        'ps_tipo_identificacion': 'CED',
        'ps_identificacion': cedula
    })
    // get cedula data
    let cedulaData = await axios.get(url).then(res => parseCedula(res.data));
    
    // get estado de cuenta
    res = await axios.get(
        assemble_url(domain + estado_de_cuenta, {
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
        'P': 'pendientes',
        'R': 'en inputacion',
        'A': 'Anuladas',
        'G': 'pagadas',
        'C': 'en convenio'
    };
    for (let type in ticketTypes) {
        let url = assemble_url(domain + path_json, {
            'ps_opcion': type,
            'ps_id_contrato': '',
            'ps_id_persona': cedulaData.id_persona,
            'ps_placa': '',
            'ps_identificacion': cedula,
            'ps_tipo_identificacion': 'CED',
            '_search': 'false',
            'nd': '1699970748700',// this does nothing
            'rows': '50',
            'page': '1',
            'sidx': 'fecha_emision',
            'sord': 'desc'
        })
        let tickets = await axios.get(url);
        cedulaData['tickets'][ticketTypes[type]] = tickets.data;
        if (tickets.data.rows.length > 50) {
            console.log(`found ${tickets.data.rows.length} ${ticketTypes[type]} tickets`);
            console.log(cedulaData)
            // cedula to file write to file
            await fs.writeFile(`./${cedula}_too_big.json`, JSON.stringify(cedulaData), (err) => {
                if (err) throw err;
                console.log('The file has been saved!');
            }
            );
        }
    }

    // get points history
    url = assemble_url(domain + puntos_path_json, {
        'ps_opcion': 'P',
        'ps_id_persona': cedulaData.id_persona,
        'ps_id_empresa': '01',
        '_search': 'false',
        'nd': '1699970748700',// this does nothing
        'rows': '50',
        'page': '1',
        'sidx': 'fecha_emision',
        'sord': 'desc'
    })
    let points_history = await axios.get(url);
    cedulaData['points_history'] = clean(points_history.data);

    // return cedula data
    return cedulaData;
}

export default scap_cedula;