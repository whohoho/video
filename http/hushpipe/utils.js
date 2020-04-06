


export const rec_mimetypes = [
  'video/webm',
  'video/webm;codecs=vp8',
  'video/webm;codecs=vp9',
  'video/webm;codecs=vp8.0',
  'video/webm;codecs=vp9.0',
  'video/webm;codecs=h264',
  'video/webm;codecs=H264',
  'video/webm;codecs=avc1',
  'video/webm;codecs=vp8,opus',
  'video/WEBM;codecs=VP8,OPUS',
  'video/webm;codecs=vp9,opus',
  'video/webm;codecs=vp8,vp9,opus',
  'video/webm;codecs=h264,opus',
  'video/webm;codecs=h264,vp9,opus',
  'video/x-matroska;codecs=avc1',
  'audio/webm',
  'audio/webm;codecs=opus',
];



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

