import 'dotenv/config';
import cors from 'cors';
import express from 'express';
import { createClient } from '@supabase/supabase-js';
import { scoreReaderProfile } from '../../shared/score-profile.js';
import { createReportPdf } from './report-pdf.js';

const app = express();
const port = Number(process.env.PORT ?? 3000);
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_PUBLISHABLE_KEY;

app.use(cors({ origin: process.env.WEB_ORIGIN ?? 'http://localhost:4200' }));
app.use(express.json({ limit: '1mb' }));

app.get('/api/health', (_request, response) => {
  response.json({ status: 'ok', project: 'Cria Livros' });
});

app.get('/api/reports/me.pdf', async (request, response) => {
  if (!supabaseUrl || !supabaseKey) {
    return response.status(503).json({ message: 'Configure o Supabase no servidor.' });
  }

  const accessToken = request.header('authorization')?.replace(/^Bearer\s+/i, '');
  if (!accessToken) {
    return response.status(401).json({ message: 'Entre na sua conta para exportar o relatório.' });
  }

  const authClient = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: authData, error: authError } = await authClient.auth.getUser(accessToken);
  if (authError || !authData.user) {
    return response.status(401).json({ message: 'A sessão expirou. Entre novamente.' });
  }

  const userClient = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });
  const [{ data: profile, error: profileError }, { data: contact, error: contactError }] =
    await Promise.all([
      userClient.from('reading_profiles').select('answers').eq('user_id', authData.user.id).maybeSingle(),
      userClient.from('reader_contact_profiles').select('display_name').eq('user_id', authData.user.id).maybeSingle(),
    ]);

  if (profileError || contactError) {
    return response.status(500).json({ message: 'Não foi possível carregar o relatório.' });
  }
  if (!profile?.answers || !contact?.display_name) {
    return response.status(403).json({ message: 'Conclua o mapeamento antes de exportar o relatório.' });
  }

  let score;
  try {
    score = scoreReaderProfile(profile.answers);
  } catch {
    return response.status(422).json({ message: 'As respostas do mapeamento estão incompletas.' });
  }

  try {
    const pdf = await createReportPdf({
      fullName: contact.display_name,
      scores: score.scores,
      primary: score.primary,
      secondary: score.secondary,
    });
    response
      .status(200)
      .type('application/pdf')
      .set('Content-Disposition', 'attachment; filename="cria-livros-perfil-leitor.pdf"')
      .set('Cache-Control', 'private, no-store')
      .send(pdf);
  } catch {
    response.status(500).json({ message: 'Não foi possível gerar o PDF agora.' });
  }
});

app.use((error, _request, response, _next) => {
  response.status(500).json({ message: 'Ocorreu um erro interno.' });
});

if (process.env.NODE_ENV !== 'test') {
  app.listen(port, () => {
    console.log(`Cria Livros API disponível em http://localhost:${port}`);
  });
}

export { app };
