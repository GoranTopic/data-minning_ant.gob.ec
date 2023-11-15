import cheerio from 'cheerio';
import clean from '../utils/clean.js';

const parseEstado = htmlContent => {
    let content = {};
    const $ = cheerio.load(htmlContent);
    // get all the data from the table
    content['Valor Pendiente'] = clean($('.MarcoTitulo > tbody:nth-child(1) > tr:nth-child(1) > td:nth-child(2) font').text());
    content['Valor Convenio'] = clean($('.MarcoTitulo > tbody:nth-child(1) > tr:nth-child(1) > td:nth-child(4) font').text());
    content['Intereses Pendiente'] = clean($('.MarcoTitulo > tbody:nth-child(1) > tr:nth-child(1) > td:nth-child(6) font').text());
    content['Total remisión'] = clean($('.MarcoTitulo > tbody:nth-child(1) > tr:nth-child(1) > td:nth-child(8) font').text());
    content['ANT'] = clean($('.MarcoTitulo > tbody:nth-child(1) > tr:nth-child(1) > td:nth-child(10) font').text());
    content['TOTAL'] = clean($('.MarcoTitulo > tbody:nth-child(1) > tr:nth-child(2) > td:nth-child(10) > font').text());
    return content;
}

export default parseEstado;
