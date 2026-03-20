let loaded = false

const sheetURL =
"https://docs.google.com/spreadsheets/d/1pmPq-pckTOAxXXWfgH3C7A-2RJbNGAyeEBTXZD6rOJw/export?format=csv"

let cards = []

async function loadSheet(){

 const response = await fetch(sheetURL)
 const text = await response.text()

 const rows = text.split("\n").slice(1)

 rows.forEach(row=>{
    const cols = row.split(",")

    cards.push({
       name: cols[0],
       count: cols[1]
    })
 })

 loaded = true
}

loadSheet()

async function searchCard(){

 if(!loaded){
  document.getElementById("result").innerHTML = "Loading data..."
  return
 }

 const query =
 document.getElementById("searchBox").value
 .toLowerCase()
 .trim()

 const card = cards.find(c =>
 c.name.toLowerCase() === query
 )

 if(!card){
  document.getElementById("result").innerHTML = "Card not found in your collection"
  return
 }

 // Fetch card info from API
 const apiURL =
 `https://db.ygoprodeck.com/api/v7/cardinfo.php?name=${encodeURIComponent(card.name)}`

 const res = await fetch(apiURL)
 const data = await res.json()

 const info = data.data[0]

 let html = `
 <div class="card">
  <h2>${info.name}</h2>
  <img src="${info.card_images[0].image_url}" width="200">

  <p><strong>You own:</strong> ${card.count}</p>

  <p><strong>Type:</strong> ${info.type}</p>
 `

 if(info.attribute){
  html += `<p><strong>Attribute:</strong> ${info.attribute}</p>`
 }

 if(info.race){
  html += `<p><strong>Monster Type:</strong> ${info.race}</p>`
 }

 if(info.level){
  html += `<p><strong>Level:</strong> ${info.level}</p>`
 }

 if(info.atk){
  html += `<p><strong>ATK:</strong> ${info.atk}</p>`
 }

 if(info.def){
  html += `<p><strong>DEF:</strong> ${info.def}</p>`
 }

 html += `
  <p><strong>Description:</strong> ${info.desc}</p>
 </div>
 `

 document.getElementById("result").innerHTML = html
}
