import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const GITHUB_API = 'https://api.github.com';

Deno.serve(async (req) => {
  // Responde ao preflight do navegador (CORS)
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS });
  }

  if (req.method !== 'POST') {
    return json({ error: 'Método não permitido.' }, 405);
  }

  try {
    const authHeader = req.headers.get('Authorization') ?? '';
    const token = authHeader.replace(/^Bearer\s+/i, '');
    if (!token) return json({ error: 'Token ausente.' }, 401);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    // Valida o token usando a chave Admin (mais seguro contra chaves anon antigas)
    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const { data: userData, error: userError } = await adminClient.auth.getUser(token);
    
    if (userError || !userData?.user) return json({ error: 'Sessão expirada. Faça login novamente.' }, 401);
    if (userData.user.app_metadata?.role !== 'admin') return json({ error: 'Acesso negado.' }, 403);

    const referenced = new Set<string>();
    const collect = (v: any) => {
      if (!v) return;
      if (typeof v === 'string') { referenced.add(v.split('?')[0]); return; }
      if (Array.isArray(v)) { v.forEach(collect); return; }
      if (typeof v === 'object' && v.u) referenced.add(v.u.split('?')[0]);
    };

    const { data: products } = await adminClient.from('products').select('images');
    (products ?? []).forEach((p) => collect(p.images));
    const { data: banners } = await adminClient.from('banners').select('img');
    (banners ?? []).forEach((b) => collect(b.img));
    const { data: ads } = await adminClient.from('ads').select('img');
    (ads ?? []).forEach((a) => collect(a.img));
    const { data: categories } = await adminClient.from('categories').select('img');
    (categories ?? []).forEach((c) => collect(c.img));

    const ghToken = Deno.env.get('GITHUB_TOKEN');
    const owner = Deno.env.get('GITHUB_OWNER') ?? 'wendell544';
    const repo = Deno.env.get('GITHUB_REPO') ?? 'ImpactoLoja';
    const branch = Deno.env.get('GITHUB_BRANCH') ?? 'main';

    const ghHeaders = {
      Authorization: `Bearer ${ghToken}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'Cleanup-Orphans',
    };

    const listRes = await fetch(`${GITHUB_API}/repos/${owner}/${repo}/contents/img?ref=${branch}`, { headers: ghHeaders });
    if (!listRes.ok) return json({ error: `Erro no GitHub: ${listRes.status}` }, 502);

    const files = await listRes.json();
    const orphans = files.filter((f: any) => {
      if (f.type !== 'file') return false;
      if (!/^i_[a-f0-9]+\.webp$/.test(f.name)) return false;
      const publicUrl = `https://${owner}.github.io/${repo}/img/${f.name}`;
      return !referenced.has(publicUrl);
    });

    const removed = [], errors = [];
    for (const file of orphans) {
      const delRes = await fetch(`${GITHUB_API}/repos/${owner}/${repo}/contents/img/${file.name}`, {
        method: 'DELETE',
        headers: { ...ghHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: `cleanup: ${file.name}`, sha: file.sha, branch }),
      });
      if (delRes.ok) removed.push(file.name);
      else errors.push(`${file.name}: ${delRes.status}`);
    }

    return json({ removed, kept: files.length - orphans.length, total: files.length });
  } catch (e) {
    return json({ error: `Erro inesperado: ${e.message}` }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });
}
