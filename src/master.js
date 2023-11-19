import init from './init.js';
import slavery from 'slavery-js';

slavery({
    host: 'localhost', // '192.168.50.239',
    port : 3005,
}).master( async master => {
    // get which cedulas we are reading from
    let { proxies, store, checklist } = await init();
    // loop through cedulas
    while (checklist.isNotDone()) {
        // get slave
        let slave = await master.getIdle();
        slave.run({ 
            proxy: proxies.next(),
            cedula: checklist.next(),
        }).then( async ({ cedula, data }) =>  {
            console.log(`${cedula}: `, data);
            // save data
            await store.set(cedula, data);
            // mark cedula as done
            checklist.check(cedula);
            // log
            console.log(`cedula ${cedula} checked, ${checklist._values.length}/${checklist._missing_values.length} left`);
        }).catch( error => { console.log( error ) });
    }
})
