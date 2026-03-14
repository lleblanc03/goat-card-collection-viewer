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
       set: cols[1],
       quantity: cols[2],
       rarity: cols[3],
       condition: cols[4]
    })
 })
}

loadSheet()

function searchCard(){

 const query =
 document.getElementById("searchBox").value.toLowerCase()

 const results =
 cards.filter(card =>
 card.name.toLowerCase().includes(query)
 )

 let html = ""

 results.forEach(card => {

  html += `
  <div class="card">
   <h3>${card.name}</h3>
   <p>Set: ${card.set}</p>
   <p>Quantity: ${card.quantity}</p>
   <p>Rarity: ${card.rarity}</p>
   <p>Condition: ${card.condition}</p>
  </div>
  `

 })

 document.getElementById("result").innerHTML = html

}
