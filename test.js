const date = new Date(Date.now()).toLocaleTimeString("uk-UA", { timeZone: 'Europe/Kiev' }).slice(0,-3).slice(0, 2)
console.log(date);