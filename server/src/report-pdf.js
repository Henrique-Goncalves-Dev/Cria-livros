import fs from 'node:fs/promises';
import PDFDocument from 'pdfkit';

const profileFile = new URL('../../web/public/data/reader-profiles.json', import.meta.url);

async function readProfileContent() {
  return JSON.parse(await fs.readFile(profileFile, 'utf8'));
}

function section(doc, title, content) {
  doc.moveDown(0.65);
  doc.font('Helvetica-Bold').fontSize(10).fillColor('#4f3459').text(title);
  doc.moveDown(0.2);
  doc.font('Helvetica').fontSize(10).fillColor('#242227').text(content, {
    align: 'left',
    lineGap: 3,
    paragraphGap: 5,
  });
}

/** @param {{ fullName: string, scores: Record<string, number>, primary: string[], secondary: string[] }} input */
export async function createReportPdf(input) {
  const content = await readProfileContent();
  const profileByKey = new Map(content.profiles.map((profile) => [profile.key, profile]));
  const selectedKeys = [...new Set([...input.primary, ...input.secondary])];
  const profiles = selectedKeys.map((key) => profileByKey.get(key)).filter(Boolean);

  if (profiles.length === 0) {
    throw new Error('Nenhum perfil válido foi encontrado para o relatório.');
  }

  return new Promise((resolve, reject) => {
    const document = new PDFDocument({
      size: 'A4',
      margins: { top: 54, right: 54, bottom: 54, left: 54 },
      info: {
        Title: 'Relatório de Perfil Leitor — Cria Livros',
        Author: 'Cria Livros',
        Subject: 'Mapeamento de Perfil Leitor',
      },
    });
    const chunks = [];
    document.on('data', (chunk) => chunks.push(chunk));
    document.on('error', reject);
    document.on('end', () => resolve(Buffer.concat(chunks)));

    document.font('Helvetica-Bold').fontSize(11).fillColor('#4f3459').text('CRIA LIVROS');
    document.moveDown(0.8);
    document.fontSize(25).fillColor('#242227').text('Seu perfil leitor');
    document.moveDown(0.25);
    document.font('Helvetica').fontSize(12).fillColor('#514b53').text(input.fullName);
    document.moveDown(1.1);

    const primaryNames = input.primary.map((key) => profileByKey.get(key)?.name).filter(Boolean);
    const secondaryNames = input.secondary.map((key) => profileByKey.get(key)?.name).filter(Boolean);
    document.font('Helvetica-Bold').fontSize(12).fillColor('#242227').text(
      primaryNames.length > 1 ? 'Seu perfil predominante combina:' : 'Seu perfil predominante:',
    );
    document.font('Helvetica').fontSize(12).text(primaryNames.join(' + '));
    if (secondaryNames.length) {
      document.moveDown(0.35);
      document.font('Helvetica-Bold').text(
        secondaryNames.length > 1 ? 'Perfis secundários:' : 'Perfil secundário:',
      );
      document.font('Helvetica').text(secondaryNames.join(' + '));
    }

    document.moveDown(0.7);
    document.font('Helvetica-Bold').fontSize(11).fillColor('#4f3459').text('Sua pontuação');
    for (const [key, value] of Object.entries(input.scores)) {
      const name = profileByKey.get(key)?.name ?? key;
      document.font('Helvetica').fontSize(10).fillColor('#242227').text(`${name}  ${value} de 12`);
    }

    document.moveDown(0.8);
    document.font('Helvetica').fontSize(10).fillColor('#514b53').text(content.intro, {
      lineGap: 3,
    });

    for (const [index, profile] of profiles.entries()) {
      document.addPage();
      document.font('Helvetica-Bold').fontSize(23).fillColor('#242227').text(profile.name);
      document.moveDown(0.2);
      document.font('Helvetica').fontSize(11).fillColor('#8a547b')
        .text(`${profile.tagline}  |  Motivação: ${profile.motivation}`);
      section(document, 'Descrição geral', profile.description);
      section(document, 'Como se relaciona com a leitura', profile.relationship);
      section(document, 'Potencialidades do perfil', profile.strengths);
      section(document, 'Pontos de atenção na curadoria', profile.curationCare);
      section(document, 'Experiência literária mais adequada', profile.experience);
      section(document, 'Palavras-chave', profile.keywords.join('  ·  '));
      section(document, 'Gêneros e estilos que podem despertar interesse', profile.genres);
      section(document, 'Sua mensagem de devolutiva', profile.message);
      document.font('Helvetica').fontSize(8).fillColor('#77717a')
        .text(`Perfil ${index + 1} de ${profiles.length}`, 54, 780, { align: 'right' });
    }

    document.addPage();
    document.font('Helvetica-Bold').fontSize(17).fillColor('#242227').text('Como ler este resultado');
    section(document, 'Nota metodológica', content.methodology);
    document.font('Helvetica').fontSize(10).fillColor('#514b53').text(
      'As respostas complementares também orientam a curadoria: gêneros desejados, temas a evitar, tempo disponível, extensão preferida e momento de leitura.',
      { lineGap: 3 },
    );
    document.moveDown(2);
    document.font('Helvetica-Bold').fontSize(12).fillColor('#4f3459').text('Agora você é parte da Comunidade Cria Livros!');
    document.moveDown(0.4);
    document.font('Helvetica').fontSize(10).fillColor('#242227').text(
      'Mais do que livros, queremos compartilhar histórias, descobertas e experiências que aproximam pessoas por meio da leitura. Nossa comunidade é um cantinho para quem ama ler, quer descobrir novas histórias, trocar experiências e encontrar novas formas de se conectar com o universo literário. Entre, fique à vontade e venha fazer parte dessa jornada com a gente. Afinal, toda boa história merece ser compartilhada.',
      { lineGap: 3 },
    );

    document.end();
  });
}
