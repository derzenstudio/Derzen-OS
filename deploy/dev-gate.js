// Gate script for the internal surface. The real wall is in .htaccess on the
// host: without a valid credential the server never sends the application
// bundle, it sends this page instead. This file only helps a human present
// the credential; it makes no security decision of its own.
(function () {
  var mode = document.body.getAttribute("data-mode");
  var head = document.getElementById("head");
  var blurb = document.getElementById("blurb");
  var note = document.getElementById("note");
  var form = document.getElementById("gate");
  var field = document.getElementById("key");

  if (mode === "token") {
    head.textContent = "Internal access";
    blurb.textContent =
      "This console is not public. Enter the shared access phrase and the server will start sending you the application in this browser.";
    note.textContent =
      "The phrase is held as a repository secret and is checked by the web server, not by this page. It is remembered for twelve hours.";
    form.hidden = false;
    field.focus();
  } else {
    head.textContent = "This host is closed";
    blurb.textContent =
      "No access wall is configured for this deployment, so the internal bundle is not being served to anyone. Nothing here is downloadable.";
    note.textContent =
      "To open it, set DEV_HTPASSWD_PATH for HTTP basic auth, or DEV_ACCESS_TOKEN for a shared phrase, in the repository Actions secrets, then run the deploy workflow again.";
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var value = field.value.trim();
    if (!value) return;
    var bits = [
      "derzen_dev=" + encodeURIComponent(value),
      "path=/",
      "max-age=43200",
      "samesite=Strict",
    ];
    if (location.protocol === "https:") bits.push("secure");
    document.cookie = bits.join("; ");
    note.textContent = "Checking that phrase with the server.";
    location.replace("/");
  });
})();
