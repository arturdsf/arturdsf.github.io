function abrirSinopse(titulo, sinopse){

document.getElementById("tituloLivro").innerText = titulo;
document.getElementById("textoSinopse").innerText = sinopse;

var modal = new bootstrap.Modal(document.getElementById('sinopseModal'));

modal.show();

}

document.querySelectorAll('.nav-link').forEach(link => {
  link.addEventListener('click', () => {
    const menu = document.getElementById('menu');
    const bsCollapse = bootstrap.Collapse.getInstance(menu);
    if (bsCollapse) {
      bsCollapse.hide();
    }
  });
});