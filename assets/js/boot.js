/* Стан «є JS» до першого малювання, щоб анімації появи не блимали.
   Запобіжник: якщо основний скрипт не завантажився – показуємо все через 3 с. */
(function () {
  var d = document.documentElement;
  d.classList.add('js');
  setTimeout(function () {
    d.classList.add('is-loaded');
    var els = document.querySelectorAll('[data-reveal]');
    for (var i = 0; i < els.length; i++) els[i].classList.add('is-in');
  }, 3000);
})();
