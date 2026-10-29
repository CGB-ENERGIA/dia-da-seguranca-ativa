/**
 * Acesso ao relatório (usuário + senha). Só o hash fica no código, mas atenção: num site estático isso é uma barreira de tela,
 * não segurança de servidor — quem tiver o hash pode testar senhas curtas. Para proteção real use Supabase Auth.
 */
const SAL = "dsa-cgb";
const HASHES: Record<string, string> = {
  "@marcusqueiros": "213518c28974e7c864661bf9f3cf2d370c1fb94a0265e103adbf0a87df44d397",
};

const sha256 = async (s: string) =>
  [...new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s)))].map(b => b.toString(16).padStart(2, "0")).join("");

export async function validarAdmin(usuario: string, senha: string): Promise<string | null> {
  const u = usuario.trim().toLowerCase();
  const esperado = HASHES[u];
  if (!esperado) return null;
  return (await sha256(`${SAL}|${u}|${senha}`)) === esperado ? u : null;
}
