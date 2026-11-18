const API_URL = "https://localhost:7000/api/Materiais";

// ---------- Elementos ----------
const listaMateriais = document.querySelector("#listaMateriais");
const semMateriais = document.querySelector("#semMateriais");
const caixaMensagem = document.querySelector("#mensagem");

const modalDetalhes = new bootstrap.Modal(document.querySelector("#modalDetalhes"));
const modalEditar = new bootstrap.Modal(document.querySelector("#modalEditar"));

// ---------- Mensagens ----------
let timerMensagem;
function mostrarMensagem(texto, tipo = "success") {
  caixaMensagem.textContent = texto;
  caixaMensagem.className = `alert alert-${tipo}`;
  clearTimeout(timerMensagem);
  timerMensagem = setTimeout(() => caixaMensagem.classList.add("d-none"), 5000);
}

async function lerMensagemErro(response) {
  try {
    const dados = await response.json();
    return dados.mensagem || dados.message || dados.title || JSON.stringify(dados);
  } catch {
    return `Erro ${response.status}`;
  }
}

// ---------- Utilidades ----------
function ehLivro(material) {
  return (material.tipo || "").toLowerCase() === "livro" ||
         (material.autor !== undefined && material.autor !== null);
}

function marcarCampo(input, valido) {
  input.classList.toggle("is-invalid", !valido);
  return valido;
}

function anoValido(valor) {
  const ano = Number(valor);
  return Number.isInteger(ano) && ano > 0 && ano <= new Date().getFullYear();
}

function inteiroPositivo(valor) {
  const n = Number(valor);
  return Number.isInteger(n) && n > 0;
}

function mesValido(valor) {
  const n = Number(valor);
  return Number.isInteger(n) && n >= 1 && n <= 12;
}

function textoPreenchido(valor) {
  return valor.trim().length > 0;
}

// ---------- GET: listar ----------
async function carregarMateriais() {
  try {
    const response = await fetch(API_URL);
    if (!response.ok) throw new Error(await lerMensagemErro(response));
    const materiais = await response.json();
    renderizarMateriais(materiais);
    atualizarResumo(materiais);
  } catch (erro) {
    listaMateriais.textContent = "";
    semMateriais.classList.add("d-none");
    mostrarMensagem("Não foi possível carregar os materiais: " + erro.message, "danger");
  }
}

function criarBotao(texto, classe, acao, id, icone) {
  const botao = document.createElement("button");
  botao.type = "button";
  botao.className = `btn btn-sm ${classe}`;
  botao.dataset.acao = acao;
  botao.dataset.id = id;

  const i = document.createElement("i");
  i.className = `bi ${icone} me-1`;
  i.setAttribute("aria-hidden", "true");

  botao.append(i, document.createTextNode(texto));
  return botao;
}

function renderizarMateriais(materiais) {
  listaMateriais.textContent = "";
  semMateriais.classList.toggle("d-none", materiais.length > 0);

  materiais.forEach((m) => {
    const tr = document.createElement("tr");
    const livro = ehLivro(m);

    const detalhes = livro
      ? `Autor: ${m.autor} | Páginas: ${m.numeroPaginas}`
      : `Edição: ${m.edicao} | Mês: ${m.mesPublicacao}`;

    // ID, título e ano
    [m.id, m.titulo, m.anoPublicacao].forEach((valor) => {
      const td = document.createElement("td");
      td.textContent = valor;
      tr.appendChild(td);
    });

    // Tipo como badge colorido
    const tdTipo = document.createElement("td");
    const tag = document.createElement("span");
    tag.className = `tag-tipo ${livro ? "tag-livro" : "tag-revista"}`;
    tag.textContent = livro ? "Livro" : "Revista";
    tdTipo.appendChild(tag);
    tr.appendChild(tdTipo);

    // Detalhes
    const tdDetalhes = document.createElement("td");
    tdDetalhes.textContent = detalhes;
    tr.appendChild(tdDetalhes);

    // Ações
    const tdAcoes = document.createElement("td");
    tdAcoes.append(
      criarBotao("Consultar", "btn-outline-primary", "consultar", m.id, "bi-search"),
      criarBotao("Descrição", "btn-outline-info", "descricao", m.id, "bi-info-circle"),
      criarBotao("Editar", "btn-outline-warning", "editar", m.id, "bi-pencil"),
      criarBotao("Emprestar", "btn-outline-success", "emprestar", m.id, "bi-box-arrow-right"),
      criarBotao("Excluir", "btn-outline-danger", "excluir", m.id, "bi-trash")
    );
    tr.appendChild(tdAcoes);

    listaMateriais.appendChild(tr);
  });
}

function atualizarResumo(materiais) {
  const livros = materiais.filter(ehLivro).length;
  document.querySelector("#totalMateriais").textContent = materiais.length;
  document.querySelector("#totalLivros").textContent = livros;
  document.querySelector("#totalRevistas").textContent = materiais.length - livros;
}

// ---------- Cliques nos botões da tabela ----------
listaMateriais.addEventListener("click", (evento) => {
  const botao = evento.target.closest("button[data-acao]");
  if (!botao) return;
  const id = botao.dataset.id;

  switch (botao.dataset.acao) {
    case "consultar": consultarMaterial(id); break;
    case "descricao": consultarDescricao(id); break;
    case "editar": abrirEdicao(id); break;
    case "emprestar": emprestarMaterial(id); break;
    case "excluir": excluirMaterial(id); break;
  }
});

// ---------- Modal de detalhes ----------
function mostrarDetalhes(titulo, linhas) {
  document.querySelector("#tituloDetalhes").textContent = titulo;
  const corpo = document.querySelector("#conteudoDetalhes");
  corpo.textContent = "";
  linhas.forEach(([rotulo, valor]) => {
    const p = document.createElement("p");
    p.className = "mb-2";
    const strong = document.createElement("strong");
    strong.textContent = rotulo + ": ";
    p.append(strong, document.createTextNode(valor));
    corpo.appendChild(p);
  });
  modalDetalhes.show();
}

// ---------- GET por ID ----------
async function consultarMaterial(id) {
  try {
    const response = await fetch(`${API_URL}/${id}`);
    if (response.status === 404) throw new Error("Material não encontrado.");
    if (!response.ok) throw new Error(await lerMensagemErro(response));
    const m = await response.json();

    const linhas = [
      ["ID", m.id],
      ["Título", m.titulo],
      ["Ano", m.anoPublicacao],
      ["Tipo", ehLivro(m) ? "Livro" : "Revista"],
    ];
    if (ehLivro(m)) {
      linhas.push(["Autor", m.autor], ["Páginas", m.numeroPaginas]);
    } else {
      linhas.push(["Edição", m.edicao], ["Mês", m.mesPublicacao]);
    }
    mostrarDetalhes("Detalhes do material", linhas);
  } catch (erro) {
    mostrarMensagem(erro.message, "danger");
  }
}

// ---------- GET descrição e prazo ----------
async function consultarDescricao(id) {
  try {
    const response = await fetch(`${API_URL}/${id}/descricao`);
    if (response.status === 404) throw new Error("Material não encontrado.");
    if (!response.ok) throw new Error(await lerMensagemErro(response));
    const d = await response.json();

    mostrarDetalhes("Descrição e prazo", [
      ["Tipo", d.tipo],
      ["Descrição", d.descricao],
      ["Prazo de empréstimo", d.prazoEmprestimo + " dias"],
    ]);
  } catch (erro) {
    mostrarMensagem(erro.message, "danger");
  }
}

// ---------- POST: cadastrar livro ----------
const formLivro = document.querySelector("#formLivro");
formLivro.addEventListener("submit", cadastrarLivro);

async function cadastrarLivro(evento) {
  evento.preventDefault();
  const titulo = document.querySelector("#livroTitulo");
  const autor = document.querySelector("#livroAutor");
  const ano = document.querySelector("#livroAno");
  const paginas = document.querySelector("#livroPaginas");

  const valido = [
    marcarCampo(titulo, textoPreenchido(titulo.value)),
    marcarCampo(autor, textoPreenchido(autor.value)),
    marcarCampo(ano, anoValido(ano.value)),
    marcarCampo(paginas, inteiroPositivo(paginas.value)),
  ].every(Boolean);

  if (!valido) {
    mostrarMensagem("Corrija os campos destacados.", "warning");
    return;
  }

  const livro = {
    titulo: titulo.value.trim(),
    anoPublicacao: Number(ano.value),
    autor: autor.value.trim(),
    numeroPaginas: Number(paginas.value),
  };

  try {
    const response = await fetch(`${API_URL}/livro`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(livro),
    });
    if (!response.ok) throw new Error(await lerMensagemErro(response));
    formLivro.reset();
    mostrarMensagem("Livro cadastrado com sucesso!");
    carregarMateriais();
  } catch (erro) {
    mostrarMensagem("Erro ao cadastrar livro: " + erro.message, "danger");
  }
}

// ---------- POST: cadastrar revista ----------
const formRevista = document.querySelector("#formRevista");
formRevista.addEventListener("submit", cadastrarRevista);

async function cadastrarRevista(evento) {
  evento.preventDefault();
  const titulo = document.querySelector("#revistaTitulo");
  const ano = document.querySelector("#revistaAno");
  const edicao = document.querySelector("#revistaEdicao");
  const mes = document.querySelector("#revistaMes");

  const valido = [
    marcarCampo(titulo, textoPreenchido(titulo.value)),
    marcarCampo(ano, anoValido(ano.value)),
    marcarCampo(edicao, inteiroPositivo(edicao.value)),
    marcarCampo(mes, mesValido(mes.value)),
  ].every(Boolean);

  if (!valido) {
    mostrarMensagem("Corrija os campos destacados.", "warning");
    return;
  }

  const revista = {
    titulo: titulo.value.trim(),
    anoPublicacao: Number(ano.value),
    edicao: Number(edicao.value),
    mesPublicacao: Number(mes.value),
  };

  try {
    const response = await fetch(`${API_URL}/revista`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(revista),
    });
    if (!response.ok) throw new Error(await lerMensagemErro(response));
    formRevista.reset();
    mostrarMensagem("Revista cadastrada com sucesso!");
    carregarMateriais();
  } catch (erro) {
    mostrarMensagem("Erro ao cadastrar revista: " + erro.message, "danger");
  }
}

// ---------- PUT: editar ----------
const formEditar = document.querySelector("#formEditar");
formEditar.addEventListener("submit", salvarEdicao);

async function abrirEdicao(id) {
  try {
    const response = await fetch(`${API_URL}/${id}`);
    if (response.status === 404) throw new Error("Material não encontrado.");
    if (!response.ok) throw new Error(await lerMensagemErro(response));
    const m = await response.json();
    const livro = ehLivro(m);

    document.querySelector("#editId").value = m.id;
    document.querySelector("#editTipo").value = livro ? "livro" : "revista";
    document.querySelector("#editTitulo").value = m.titulo;
    document.querySelector("#editAno").value = m.anoPublicacao;

    document.querySelector("#camposLivro").classList.toggle("d-none", !livro);
    document.querySelector("#camposRevista").classList.toggle("d-none", livro);

    if (livro) {
      document.querySelector("#editAutor").value = m.autor;
      document.querySelector("#editPaginas").value = m.numeroPaginas;
    } else {
      document.querySelector("#editEdicao").value = m.edicao;
      document.querySelector("#editMes").value = m.mesPublicacao;
    }

    formEditar.querySelectorAll(".is-invalid").forEach((el) => el.classList.remove("is-invalid"));
    modalEditar.show();
  } catch (erro) {
    mostrarMensagem(erro.message, "danger");
  }
}

async function salvarEdicao(evento) {
  evento.preventDefault();
  const id = document.querySelector("#editId").value;
  const tipo = document.querySelector("#editTipo").value;
  const titulo = document.querySelector("#editTitulo");
  const ano = document.querySelector("#editAno");

  const checks = [
    marcarCampo(titulo, textoPreenchido(titulo.value)),
    marcarCampo(ano, anoValido(ano.value)),
  ];
  const dados = { titulo: titulo.value.trim(), anoPublicacao: Number(ano.value) };

  if (tipo === "livro") {
    const autor = document.querySelector("#editAutor");
    const paginas = document.querySelector("#editPaginas");
    checks.push(
      marcarCampo(autor, textoPreenchido(autor.value)),
      marcarCampo(paginas, inteiroPositivo(paginas.value))
    );
    dados.autor = autor.value.trim();
    dados.numeroPaginas = Number(paginas.value);
  } else {
    const edicao = document.querySelector("#editEdicao");
    const mes = document.querySelector("#editMes");
    checks.push(
      marcarCampo(edicao, inteiroPositivo(edicao.value)),
      marcarCampo(mes, mesValido(mes.value))
    );
    dados.edicao = Number(edicao.value);
    dados.mesPublicacao = Number(mes.value);
  }

  if (!checks.every(Boolean)) return;

  try {
    const response = await fetch(`${API_URL}/${tipo}/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(dados),
    });
    if (response.status === 404) throw new Error("Material não encontrado.");
    if (!response.ok) throw new Error(await lerMensagemErro(response));
    modalEditar.hide();
    mostrarMensagem("Material atualizado com sucesso!");
    carregarMateriais();
  } catch (erro) {
    mostrarMensagem("Erro ao atualizar: " + erro.message, "danger");
  }
}

// ---------- DELETE ----------
async function excluirMaterial(id) {
  if (!confirm("Tem certeza que deseja excluir este material?")) return;

  try {
    const response = await fetch(`${API_URL}/${id}`, { method: "DELETE" });
    if (response.status === 404) throw new Error("Material não encontrado (talvez já tenha sido excluído).");
    if (!response.ok) throw new Error(await lerMensagemErro(response));
    mostrarMensagem("Material excluído com sucesso!");
    carregarMateriais();
  } catch (erro) {
    mostrarMensagem("Erro ao excluir: " + erro.message, "danger");
  }
}

// ---------- POST: emprestar ----------
async function emprestarMaterial(id) {
  try {
    const response = await fetch(`${API_URL}/${id}/emprestar`, { method: "POST" });
    if (response.status === 404) throw new Error("Material não encontrado.");
    if (!response.ok) {
      // Revista: a API recusa o empréstimo, então mostramos o erro dela
      throw new Error(await lerMensagemErro(response));
    }
    mostrarMensagem("Empréstimo realizado com sucesso!");
  } catch (erro) {
    mostrarMensagem(erro.message, "danger");
  }
}

// ---------- Dados de exemplo (para testes) ----------
const livrosExemplo = [
  { titulo: "Dom Casmurro", anoPublicacao: 1899, autor: "Machado de Assis", numeroPaginas: 256 },
  { titulo: "Clean Code", anoPublicacao: 2008, autor: "Robert C. Martin", numeroPaginas: 464 },
  { titulo: "O Hobbit", anoPublicacao: 1937, autor: "J. R. R. Tolkien", numeroPaginas: 310 },
];

const revistasExemplo = [
  { titulo: "Superinteressante", anoPublicacao: 2024, edicao: 450, mesPublicacao: 3 },
  { titulo: "Galileu", anoPublicacao: 2024, edicao: 390, mesPublicacao: 6 },
  { titulo: "Veja", anoPublicacao: 2023, edicao: 2870, mesPublicacao: 11 },
];

async function enviarExemplo(rota, dados) {
  const response = await fetch(`${API_URL}/${rota}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(dados),
  });
  if (!response.ok) throw new Error(await lerMensagemErro(response));
}

async function popularDadosExemplo() {
  if (!confirm("Cadastrar 3 livros e 3 revistas de exemplo?")) return;

  try {
    for (const livro of livrosExemplo) {
      await enviarExemplo("livro", livro);
    }
    for (const revista of revistasExemplo) {
      await enviarExemplo("revista", revista);
    }
    mostrarMensagem("Dados de exemplo cadastrados com sucesso!");
    carregarMateriais();
  } catch (erro) {
    mostrarMensagem("Erro ao cadastrar exemplos: " + erro.message, "danger");
  }
}

document.querySelector("#btnExemplos").addEventListener("click", popularDadosExemplo);

// ---------- Início ----------
carregarMateriais();