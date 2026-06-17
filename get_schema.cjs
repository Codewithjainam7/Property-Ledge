async function getSchema() {
  try {
    const res = await fetch('https://qajdlvlwigjrdcnxejts.supabase.co/rest/v1/', {
      headers: {
        'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFhamRsdmx3aWdqcmRjbnhlanRzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA0Nzk3MzQsImV4cCI6MjA5NjA1NTczNH0.FeseI553Cv79yggo_0Acz4sTYSFU3xChGXEtffePIAQ'
      }
    });
    const data = await res.json();
    console.log("Response data:", data);
  } catch (err) {
    console.error(err);
  }
}

getSchema();
