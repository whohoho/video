

export function saveBlob(blob, name, auto) {

  
    var url=window.URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href=url;
    a.setAttribute('download', name);
    a.appendChild(document.createTextNode('download' + name + "--" ));
    document.getElementById('debug').appendChild(a);
    if (auto) {
      a.click();
    }
    //TODO: cleanup blob
}

