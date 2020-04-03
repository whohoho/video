let $ = a => document.querySelector(a);

let hush_key;

async function
hush_read_key()
{
    try {
	const key = await get_key_from_url();
	$('#hush_room_key_label').innerText = document.location.hash;
    } catch (e) {
	console.log('error reading room key', e);
    }
}

/*
 * Callback handler for the hush_newroom button
 */
async function
hush_newroom()
{
    console.log('new room key');
    await new_key();
    hush_read_key();
}

async function
hush_onload()
{
    console.log('hushpipe \nTRY\nTRY\nTRY\nTRY\nTRY\nloading');

    /* Check if we already have a key: */
    hush_read_key();

    $('#hush_newroom').onclick = hush_newroom;

    console.log('hushpipe \nOK\nOK\nOK\nOK\nOK\nOK\nloading');
}
