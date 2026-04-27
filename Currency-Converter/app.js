const BASE_URL =
  "https://cdn.jsdelivr.net/gh/fawazahmed0/currency-api@1/latest/currencies"; 

const dropdowns = document.querySelectorAll(".dropdown select");
const btn = document.querySelector("form button");
const fromCurr = document.querySelector(".from select");
const toCurr = document.querySelector(".to select");
const msg = document.querySelector(".msg");

for (let select of dropdowns) {
  for (const currCode in countryList) {
    let newOption = document.createElement("option");
    newOption.innerText = currCode;
    newOption.value = currCode;
    if (select.name === "from" && currCode === "USD") {
      newOption.selected = "selected";
    } else if (select.name === "to" && currCode === "INR") {
      newOption.selected = "selected";
    }
    select.append(newOption);
  }

  select.addEventListener("change", (evt) => {
    updateFlag(evt.target);
  });
}

const updateExchangeRate = async () => {
  try {
    btn.disabled = true;
    msg.innerText = "Fetching exchange rate...";

    const amountEl = document.querySelector(".amount input");
    let amtVal = parseFloat(amountEl.value);
    if (isNaN(amtVal) || amtVal <= 0) {
      amtVal = 1;
      amountEl.value = "1";
    }

    const from = fromCurr.value.toLowerCase();
    const to = toCurr.value.toLowerCase();

    // Primary API: exchangerate.host (stable, no API key required)
    let rate = null;
    const primaryURL = `https://api.exchangerate.host/convert?from=${from.toUpperCase()}&to=${to.toUpperCase()}`;
    console.log(`Fetching primary URL: ${primaryURL}`);
    let response = await fetch(primaryURL);

    // Try primary and parse safely; if no valid numeric rate, fall through to fallbacks
    if (response.ok) {
      const data = await response.json();
      console.log('Primary response data:', data);
      let primaryRate = null;
      if (data && typeof data === 'object') {
        if (data.info && typeof data.info.rate === 'number') {
          primaryRate = data.info.rate;
        } else if (typeof data.result === 'number') {
          primaryRate = data.result;
        }
      }

      if (primaryRate != null && !isNaN(primaryRate)) {
        rate = primaryRate;
      } else {
        console.warn('Primary API returned no valid rate; will try fallbacks');
      }
    } else {
      const text = await response.text();
      console.warn(`Primary API failed (${response.status}): ${text}`);
    }

    // If still no valid rate, try secondary and last-resort providers
    if (rate == null || isNaN(rate)) {
      // Secondary: open.er-api.com (returns a rates map)
      console.log('Trying secondary API (open.er-api.com)...');
      const secondURL = `https://open.er-api.com/v6/latest/${from.toUpperCase()}`;
      let secondResp = null;
      try {
        secondResp = await fetch(secondURL);
        console.log('Secondary response status:', secondResp.status);
        if (secondResp.ok) {
          const secondData = await secondResp.json();
          console.log('Secondary data:', secondData);
          if (secondData && secondData.rates && typeof secondData.rates[to.toUpperCase()] === 'number') {
            rate = secondData.rates[to.toUpperCase()];
          }
        }
      } catch (e) {
        console.warn('Secondary API fetch error:', e);
      }

      // If secondary didn't provide a rate, try jsDelivr as a last resort
      if (rate == null || isNaN(rate)) {
        const jsURL = `${BASE_URL}/${from}/${to}.json`;
        console.log(`Trying jsDelivr URL as last resort: ${jsURL}`);
        const jsResp = await fetch(jsURL);
        if (jsResp.ok) {
          const jsData = await jsResp.json();
          console.log('jsDelivr data:', jsData);
          if (jsData && typeof jsData[to] === 'number') {
            rate = jsData[to];
          }
        } else {
          const txt = await jsResp.text();
          throw new Error(`All APIs failed. primary:${response.status}; secondary:${secondResp ? secondResp.status : 'no-response'}; jsDelivr:${jsResp.status} ${txt}`);
        }
      }
    }

    if (rate == null || isNaN(rate)) {
      throw new Error("Invalid rate received from server");
    }

    const finalAmount = (amtVal * rate).toFixed(4);
    msg.innerText = `${amtVal} ${fromCurr.value} = ${finalAmount} ${toCurr.value}`;
  } catch (err) {
    console.error(err);
    // Show a specific message for unsupported pairs when possible
    if (err.message && err.message.includes('Both APIs failed')) {
      msg.innerText = `Rate not available for ${fromCurr.value} → ${toCurr.value}`;
    } else if (err.message && err.message.includes('404')) {
      msg.innerText = `Rate not available for ${fromCurr.value} → ${toCurr.value}`;
    } else {
      msg.innerText = "Could not fetch exchange rate. Try again later.";
    }
  } finally {
    btn.disabled = false;
  }
};

const updateFlag = (element) => {
  let currCode = element.value;
  let countryCode = countryList[currCode];
  let newSrc = `https://flagsapi.com/${countryCode}/flat/64.png`;
  let img = element.parentElement.querySelector("img");
  img.src = newSrc;
};

btn.addEventListener("click", (evt) => {
  evt.preventDefault();
  updateExchangeRate();
});

window.addEventListener("load", () => {
  updateExchangeRate();
});