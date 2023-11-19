import init from './init.js';
import scap_cedula from './scripts/scrap_cedula.js';

let { proxies, store, checklist } = await init();
// get new cedula
let cedula = checklist.next();
// get proxies
let proxy = proxies.next();

while (cedula) {
    // scrap cedula
    let data = await scap_cedula(cedula, { proxy: null })
    // save data
    console.log(`${cedula}: `, data);
    // save data
    await store.set(cedula, data);
    // mark cedula as done
    checklist.check(cedula);
    // get next values
    cedula = checklist.next();
    proxy = proxies.next();
}