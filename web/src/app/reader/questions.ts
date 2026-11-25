export interface Choice {
  value: string;
  label: string;
}

export interface SingleQuestion {
  id: string;
  prompt: string;
  options: Choice[];
}

export const PROFILE_QUESTIONS: SingleQuestion[] = [
  {
    id: 'q1',
    prompt: 'Ao escolher um livro, o que mais chama sua atenção?',
    options: [
      { value: 'A', label: 'Uma temática diferente ou algo que nunca experimentei.' },
      { value: 'B', label: 'Uma história emocionante, com personagens interessantes.' },
      { value: 'C', label: 'Um assunto que possa me ensinar alguma coisa.' },
      { value: 'D', label: 'Uma escrita bonita ou uma atmosfera envolvente.' },
    ],
  },
  {
    id: 'q2',
    prompt: 'O que você mais espera sentir ao terminar um livro?',
    options: [
      { value: 'A', label: 'Vontade de descobrir outra história diferente.' },
      { value: 'B', label: 'A sensação de ter vivido uma experiência emocionante.' },
      { value: 'C', label: 'A satisfação de ter aprendido ou compreendido algo novo.' },
      { value: 'D', label: 'A tranquilidade de ter apreciado uma experiência agradável.' },
    ],
  },
  {
    id: 'q3',
    prompt: 'Qual experiência mais combina com você?',
    options: [
      { value: 'A', label: 'Explorar diferentes gêneros e autores.' },
      { value: 'B', label: 'Criar conexão com os personagens.' },
      { value: 'C', label: 'Refletir sobre ideias e conhecimentos.' },
      { value: 'D', label: 'Ler devagar, apreciando cada página.' },
    ],
  },
  {
    id: 'q4',
    prompt: 'Quando alguém indica um livro, o que desperta seu interesse?',
    options: [
      { value: 'A', label: 'Ser algo novo e fora do comum.' },
      { value: 'B', label: 'Ter uma história capaz de mexer comigo.' },
      { value: 'C', label: 'Abordar um assunto interessante e relevante.' },
      { value: 'D', label: 'Ter uma escrita envolvente e uma apresentação encantadora.' },
    ],
  },
  {
    id: 'q5',
    prompt: 'Em uma livraria, onde você provavelmente começaria a procurar?',
    options: [
      { value: 'A', label: 'Nas novidades e categorias que ainda não conheço.' },
      { value: 'B', label: 'Em romances, dramas e histórias envolventes.' },
      { value: 'C', label: 'Em história, ciência, filosofia e desenvolvimento pessoal.' },
      { value: 'D', label: 'Em poesia, clássicos e livros de escrita marcante.' },
    ],
  },
  {
    id: 'q6',
    prompt: 'Qual seria seu cenário ideal de leitura?',
    options: [
      { value: 'A', label: 'Um lugar diferente, descobrindo uma história inesperada.' },
      { value: 'B', label: 'Um ambiente aconchegante com uma história emocionante.' },
      { value: 'C', label: 'Um espaço tranquilo para estudar e refletir.' },
      { value: 'D', label: 'Um cantinho confortável, com tempo para apreciar a leitura.' },
    ],
  },
  {
    id: 'q7',
    prompt: 'Se pudesse escolher um presente literário, qual seria?',
    options: [
      { value: 'A', label: 'Um livro surpresa de um gênero que nunca li.' },
      { value: 'B', label: 'Um romance ou história que me faça sentir muitas emoções.' },
      { value: 'C', label: 'Um livro que amplie meus conhecimentos.' },
      { value: 'D', label: 'Uma obra com escrita marcante ou edição especial.' },
    ],
  },
  {
    id: 'q8',
    prompt: 'O que costuma fazer você abandonar um livro?',
    options: [
      { value: 'A', label: 'Sentir que a história não apresenta novidades.' },
      { value: 'B', label: 'Não conseguir me conectar com os personagens ou acontecimentos.' },
      { value: 'C', label: 'Não encontrar conteúdo interessante ou consistente.' },
      { value: 'D', label: 'Não gostar da linguagem ou do ritmo da narrativa.' },
    ],
  },
  {
    id: 'q9',
    prompt: 'Qual frase representa melhor sua relação com a leitura?',
    options: [
      { value: 'A', label: 'Quero conhecer histórias que ainda nem imagino existir.' },
      { value: 'B', label: 'Quero encontrar histórias que conversem com meus sentimentos.' },
      { value: 'C', label: 'Quero aprender algo novo sempre que abro um livro.' },
      { value: 'D', label: 'Quero aproveitar cada palavra e cada detalhe.' },
    ],
  },
  {
    id: 'q10',
    prompt: 'Se recebesse um livro escolhido especialmente para você, o que mais gostaria?',
    options: [
      { value: 'A', label: 'Uma descoberta surpreendente.' },
      { value: 'B', label: 'Uma história que me emocione.' },
      { value: 'C', label: 'Uma obra que acrescente conhecimento.' },
      { value: 'D', label: 'Uma experiência de leitura bonita e especial.' },
    ],
  },
  {
    id: 'q11',
    prompt: 'Quando uma história termina, o que geralmente acontece?',
    options: [
      { value: 'A', label: 'Procuro outra experiência literária.' },
      { value: 'B', label: 'Continuo pensando nos personagens e no que aconteceu.' },
      { value: 'C', label: 'Reflito sobre as ideias e os aprendizados.' },
      { value: 'D', label: 'Fico apreciando as sensações e a escrita da obra.' },
    ],
  },
  {
    id: 'q12',
    prompt: 'O que mais combina com seu próximo momento de leitura?',
    options: [
      { value: 'A', label: 'Experimentar algo completamente novo.' },
      { value: 'B', label: 'Encontrar uma história que me envolva emocionalmente.' },
      { value: 'C', label: 'Aprender sobre um assunto que desperta minha curiosidade.' },
      { value: 'D', label: 'Desacelerar e aproveitar uma leitura prazerosa.' },
    ],
  },
];

export const GENRES = [
  'Romance',
  'Fantasia',
  'Ficção científica',
  'Suspense e mistério',
  'Drama',
  'Desenvolvimento pessoal',
  'Psicologia',
  'Filosofia',
  'História',
  'Biografias',
  'Poesia',
  'Clássicos',
  'Outros',
  'Quero descobrir',
];

export const SUPPLEMENTARY_QUESTIONS: SingleQuestion[] = [
  {
    id: 'q14',
    prompt: 'Qual tamanho de livro você prefere?',
    options: [
      { value: 'curto', label: 'Curto, até 150 páginas.' },
      { value: 'medio', label: 'Médio, de 151 a 300 páginas.' },
      { value: 'longo', label: 'Longo, com mais de 300 páginas.' },
      { value: 'sem-preferencia', label: 'Sem preferência.' },
    ],
  },
  {
    id: 'q15',
    prompt: 'Como é sua relação atual com a leitura?',
    options: [
      { value: 'comecando', label: 'Estou começando.' },
      { value: 'ocasional', label: 'Leio ocasionalmente.' },
      { value: 'frequente', label: 'Leio com frequência.' },
      { value: 'sempre-gostei', label: 'Sempre gostei de ler.' },
      { value: 'retomar', label: 'Quero retomar o hábito.' },
    ],
  },
  {
    id: 'q16',
    prompt: 'Quanto tempo gostaria de dedicar à leitura?',
    options: [
      { value: 'ate-15', label: 'Até 15 minutos por dia.' },
      { value: '15-30', label: 'De 15 a 30 minutos.' },
      { value: '30-60', label: 'De 30 minutos a 1 hora.' },
      { value: 'mais-60', label: 'Mais de 1 hora.' },
      { value: 'sem-rotina', label: 'Ainda não tenho uma rotina.' },
    ],
  },
  {
    id: 'q19',
    prompt: 'Como gostaria de receber a indicação?',
    options: [
      { value: 'surpresa', label: 'Quero ser surpreendido.' },
      { value: 'participar', label: 'Quero participar da escolha.' },
      { value: 'motivo', label: 'Quero conhecer a recomendação e o motivo.' },
    ],
  },
];

export const FREE_TEXT_QUESTIONS = [
  { id: 'q17', prompt: 'Existe algum tema ou conteúdo que prefere evitar?' },
  { id: 'q18', prompt: 'Que sentimento ou experiência gostaria que seu próximo livro proporcionasse?' },
  { id: 'q20', prompt: 'O que tornaria essa experiência especial para você?' },
  { id: 'q21', prompt: 'Qual faixa de investimento considera confortável para uma experiência literária personalizada?' },
];
