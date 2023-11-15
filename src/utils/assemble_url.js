/* make a function that takes a obj and returns a url with all the parameters added to the url */
function assemble_url(url, obj) {
    let params = [];
    for (let key in obj) {
        params.push(`${key}=${obj[key]}`);
    }
    return `${url}?${params.join("&")}`;
}

export default assemble_url;
