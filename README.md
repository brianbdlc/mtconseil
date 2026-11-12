Outil interne MT Conseil — production de rapports d'audit énergétique (Next.js + Supabase).

## Configuration

1. Copier `.env.example` vers `.env.local` et remplir les 3 variables.
   - `NEXT_PUBLIC_SUPABASE_URL` et `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` : déjà fournies (projet DEV).
   - `SUPABASE_SECRET_KEY` : clé secret (`sb_secret_…`), dashboard Supabase > Project Settings > API keys. **Serveur uniquement**, requise pour créer des comptes.

## Bootstrap du premier admin (Luis)

Aucune inscription libre (`enable_signup = false`). Le premier compte admin se crée à la main :

1. Dashboard Supabase > Authentication > Add user → créer le compte de Luis (email + mot de passe).
2. Mettre l'email de Luis dans `supabase/seed.sql`, puis exécuter ce SQL sur le projet (dashboard SQL editor ou `supabase db reset` en local). Il crée la ligne `profiles` et la passe en `role = 'admin'`.
3. Luis peut ensuite créer les autres comptes depuis `/admin/comptes`.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
