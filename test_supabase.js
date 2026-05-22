async function getSchema() {
  const url = "https://mwrhlwlimxihhwlafnob.supabase.co/rest/v1/?apikey=sb_publishable_-_ib7F-bIZPznzpZe3hIrw_TlTelawl";
  try {
    const res = await fetch(url);
    const data = await res.json();
    console.log(Object.keys(data.definitions || {}));
  } catch (err) {
    console.error(err);
  }
}
getSchema();
