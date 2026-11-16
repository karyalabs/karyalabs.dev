// The only script on the site (the CSP allows no inline ones).

// Copy buttons for install lines; hidden where the clipboard isn't available.
if (navigator.clipboard) {
  for (const b of document.querySelectorAll("[data-copy]")) {
    b.hidden = false
    b.addEventListener("click", () => {
      navigator.clipboard.writeText(b.dataset.copy).then(() => {
        b.textContent = "Copied"
        setTimeout(() => (b.textContent = "Copy"), 1400)
      }, () => {})
    })
  }
}

// The 404 page shows the address that wasn't found.
const path = document.getElementById("path")
if (path) path.textContent = location.host + location.pathname
