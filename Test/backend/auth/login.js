fetch("http://localhost:8000/users/login", {
  "headers": {
    "accept": "application/json",
    "accept-language": "en-GB,en;q=0.9,en-US;q=0.8",
    "cache-control": "no-cache",
    "content-type": "application/json",
    "pragma": "no-cache",
    "Referer": "http://localhost:8000/docs"
  },
  "body": "{\n  \"email\": \"za441568@gmail.com\",\n  \"password\": \"^GW#H$TtF3|u\"\n}",
  "method": "POST"
}).then(res=>res.json())
.then(console.log)