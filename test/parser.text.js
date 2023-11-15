/* test parser */
import parser from '../src/parsers/parseCedula.js';
// import html as text
// Import the necessary modules
import chai from 'chai';
const expect = chai.expect;
// to make into steam   
import fs from 'fs';


// The test suite using Mocha's describe function
describe('checking parse cedula', () => {
    // read correcly html file
    const html = fs.readFileSync('./re/responses/cedula_data.html', 'utf8');
    let data = parser(html);
    
    console.log(data);
});

    /*
    it('correcly transcribs the audio "The Amazing Collaborative Process"', async () => {
        // make the post request
        let responsePromise = transcribe(
            fs.createReadStream("./test/files/amazing collaborative process.mpeg")
        );
        await expect(responsePromise).to.eventually.be.fulfilled;
        // check the response
        let response = await responsePromise;
        expect(response).to.equal("It's an amazing collaborative process.");
    });
    */


