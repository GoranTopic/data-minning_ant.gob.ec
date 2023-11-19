import fs from 'fs';
import Checklist from 'checklist-js';
import Storage from 'storing-me';
import ProxyRotator from 'proxy-rotator-js'

const init = async () => {

    // get which cedulas we are reading from
    let cedula_prefix = process.argv[2];
    // let get the phone number from the params passed
    console.log('reading cedulas starting with: ', cedula_prefix);
    if (!cedula_prefix) {
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

    return { proxies, store, checklist };
}

export default init;