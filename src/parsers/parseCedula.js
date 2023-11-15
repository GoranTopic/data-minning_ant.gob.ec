import cheerio from 'cheerio';
import clean from '../utils/clean.js';

const parseCedula = htmlContent => {
    let content = {};
    const $ = cheerio.load(htmlContent);
    // name 
    content['name'] = clean($('html body table.MarcoTitulo tbody tr td.titulo1:nth-child(1)').text());
    content['puntos'] = clean($('html body table.MarcoTitulo tbody tr td.titulo1:nth-child(3)').text());
    content['cedula'] = clean($('html body table.MarcoTitulo tbody tr td.MarcoTitulo').text().split('-')[1])
    content['licencia tipo'] = clean(
        $('html body table.MarcoTitulo tbody tr td.detalle_formulario')
        ?.text()
        ?.split('/')[0]
        ?.split(':')[1]
    );
    content['licencia validez'] = clean( 
        $('html body table.MarcoTitulo tbody tr td.detalle_formulario')
        ?.text()
        ?.split('/')[1]
        ?.split(':')[1]
    );
    // valores pendientes

    // get the ps_id_persona
    // this is aperently a importnrtn number fot the backend
    content['id_persona'] = htmlContent.match(/ps_id_persona=(\d+)/)[1];
    
    return content;
}

export default parseCedula;
