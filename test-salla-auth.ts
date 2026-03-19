import fetch from "node-fetch";

async function testAuth() {
  const CLIENT_ID = "3b98cad1-c0ea-415c-9a98-f9288cc95365";
  const SECRET = "1ad23a9c67438be75908c28ba0ce500f294609933dfebc50d80a95cb0fc14ee0";

  console.log("Attempting client_credentials grant...");
  try {
    const res = await fetch("https://accounts.salla.sa/oauth2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: CLIENT_ID,
        client_secret: SECRET,
        grant_type: "client_credentials"
      })
    });
    
    const data = await res.json();
    console.log("Response:", data);
  } catch (err) {
    console.error("Error:", err);
  }
}

testAuth();
