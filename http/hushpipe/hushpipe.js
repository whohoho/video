const previous_onload = document.onload || (() => {});
document.onload = () => {
    previous_onload();
    console.log('hushpipe loaded');
}
