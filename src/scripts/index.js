function abrirSinopse(titulo, sinopse){
  const modalEl = document.getElementById('sinopseModal');
  
  document.getElementById("tituloLivro").innerText = titulo;
  document.getElementById("textoSinopse").innerText = sinopse;
  
  const modal = new bootstrap.Modal(modalEl);
  modal.show();
}

const meuModal = document.getElementById('sinopseModal');
meuModal.addEventListener('hide.bs.modal', function () {
  if (document.activeElement && meuModal.contains(document.activeElement)) {
    document.activeElement.blur();
  }
});

document.querySelectorAll('.nav-link').forEach(link => {
  link.addEventListener('click', () => {
    const menu = document.getElementById('menu');
    const bsCollapse = bootstrap.Collapse.getInstance(menu);
    if (bsCollapse) {
      bsCollapse.hide();
    }
  });
});
