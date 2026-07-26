<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Bienvenue sur GESCRIM</title>
</head>
<body style="margin:0;padding:0;background:#f4f6f8;font-family:Arial,sans-serif;">

  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f8;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="520" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.08);">

          <!-- En-tête -->
          <tr>
            <td style="background:linear-gradient(135deg,#1B4332,#2D6A4F);padding:32px 40px;text-align:center;">
              <div style="font-size:28px;font-weight:900;color:#ffffff;letter-spacing:-0.5px;">
                TERANGA <span style="color:#52B788;">GESCRIM</span>
              </div>
              <div style="color:rgba(255,255,255,0.6);font-size:12px;margin-top:6px;">
                Plateforme Nationale de Sécurité Publique
              </div>
            </td>
          </tr>

          <!-- Corps -->
          <tr>
            <td style="padding:40px;">
              <p style="margin:0 0 8px;font-size:16px;color:#374151;font-weight:700;">
                Bienvenue, {{ $userName }} !
              </p>
              <p style="margin:0 0 24px;font-size:14px;color:#6B7280;line-height:1.6;">
                Un compte GESCRIM vous a été créé avec le rôle
                <strong style="color:#1B4332;">{{ strtoupper($role) }}</strong>.
                Voici vos identifiants de connexion.
              </p>

              <!-- Bloc identifiants -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0fdf4;border:1px solid #d1fae5;border-radius:10px;margin-bottom:28px;">
                <tr>
                  <td style="padding:24px 28px;">

                    <p style="margin:0 0 14px;font-size:13px;color:#6B7280;text-transform:uppercase;letter-spacing:0.5px;font-weight:600;">
                      Vos identifiants
                    </p>

                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding:8px 0;border-bottom:1px solid #d1fae5;">
                          <span style="font-size:13px;color:#6B7280;display:block;">Adresse e-mail</span>
                          <span style="font-size:15px;font-weight:700;color:#1B4332;">{{ $userEmail }}</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:8px 0;">
                          <span style="font-size:13px;color:#6B7280;display:block;">Mot de passe temporaire</span>
                          <span style="font-size:20px;font-weight:900;color:#1B4332;letter-spacing:3px;font-family:monospace;">
                            {{ $plainPassword }}
                          </span>
                        </td>
                      </tr>
                    </table>

                  </td>
                </tr>
              </table>

              <!-- Avertissement sécurité -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#fffbeb;border:1px solid #fde68a;border-radius:8px;margin-bottom:24px;">
                <tr>
                  <td style="padding:16px 20px;">
                    <p style="margin:0;font-size:13px;color:#92400e;line-height:1.6;">
                      ⚠️ <strong>Changez ce mot de passe dès votre première connexion.</strong><br/>
                      Ce mot de passe temporaire est à usage unique.
                      Il a été généré automatiquement par le système et ne sera plus accessible après cet email.
                    </p>
                  </td>
                </tr>
              </table>

              <p style="margin:0;font-size:13px;color:#9CA3AF;text-align:center;line-height:1.6;">
                Ne transmettez jamais vos identifiants à une tierce personne.<br/>
                Toutes les connexions sont tracées et enregistrées.
              </p>
            </td>
          </tr>

          <!-- Pied de page -->
          <tr>
            <td style="background:#f9fafb;border-top:1px solid #f3f4f6;padding:20px 40px;text-align:center;">
              <p style="margin:0;font-size:11px;color:#D1D5DB;">
                © {{ date('Y') }} Teranga GESCRIM — Direction de la Sécurité Publique
              </p>
              <p style="margin:4px 0 0;font-size:11px;color:#D1D5DB;">
                Accès réservé au personnel autorisé.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>

</body>
</html>
