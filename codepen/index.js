// var map = L.map('map').setView([51.505, -0.09], 13);
var map = L.map('map').setView([-29.5269,153.1247], 11)

const locations = [
    {
        'id': 'yamba',
        'label': 'Yamba',
        'length': 10,
        'long': -29.4253,
        'lat': 153.3509
    },
    {
        'id': 'maclean',
        'label': 'Maclean',
        'length': 0,
        'long': -29.4493,
        'lat': 153.1981
    },
    {
        'id': 'ulmarra',
        'label': 'Ulmarra',
        'length': -10,
        'long': -29.6303,
        'lat': 153.0250
    },
    {
        'id': 'grafton',
        'label': 'Grafton',
        'length': -35,
        'long': -29.69460,
        'lat': 152.93008
    }
]
const degrees = 80

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map)

  
locations.forEach(location => {
    const arrowSideX1 = 10
    const arrowSideY1 = location.length > 0 ? -location.length + 10 : -location.length - 10 
    const stroke = location.length > 0 ? 'red' : 'blue'
  
    const label = `<div class="label">${location.label}</div>`
    const arrow = `<svg id="${location.id}" class="marker" viewBox="-50 -50 100 100" xmlns="http://www.w3.org/2000/svg" stroke="${stroke}" fill="grey">
  <line x1="0" y1="0" x2="0" y2="${-location.length}" stroke-width="4" stroke-linecap="round" />
  <line x1="-${arrowSideX1}" y1="${arrowSideY1}" x2="0" y2="${-location.length}" stroke-width="4" stroke-linecap="round" />
  <line x1="${arrowSideX1}" y1="${arrowSideY1 }" x2="0" y2="${-location.length}" stroke-width="4" stroke-linecap="round" />
  </svg>`
    const content = `<div>${label}${arrow}</div>`
    const icon = L.divIcon({className: location.id })
    L.marker([location.long, location.lat], { icon })
        .addTo(map)
  
    const marker = document.getElementsByClassName(location.id)[0]
    marker.innerHTML = content
})




// const vector = document.getElementsByClassName("vector")[0]
// vector.style.transform = `rotate(${degrees}deg)`