<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Code de vérification GESCRIM</title>
</head>
<body style="margin:0;padding:0;background:#f4f6f8;font-family:Arial,sans-serif;">

  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f8;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="480" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.08);">

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
              <p style="margin:0 0 8px;font-size:15px;color:#374151;">
                Bonjour <strong>{{ $userName }}</strong>,
              </p>
              <p style="margin:0 0 28px;font-size:14px;color:#6B7280;line-height:1.6;">
                Voici votre code de vérification pour accéder à GESCRIM.
                Ce code est valable <strong>{{ $expiresInMinutes }} minutes</strong>.
              </p>

              <!-- Code OTP -->
              <div style="text-align:center;margin:0 0 28px;">
                <div style="display:inline-block;background:#f0fdf4;border:2px dashed #2D6A4F;border-radius:12px;padding:20px 40px;">
                  <span style="font-size:40px;font-weight:900;letter-spacing:12px;color:#1B4332;font-family:monospace;">
                    {{ $code }}
                  </span>
                </div>
              </div>

              <p style="margin:0 0 8px;font-size:13px;color:#9CA3AF;text-align:center;">
                Ne partagez jamais ce code avec quiconque.
              </p>
              <p style="margin:0;font-size:13px;color:#9CA3AF;text-align:center;">
                Si vous n'êtes pas à l'origine de cette demande, ignorez cet email
                et sécurisez votre compte immédiatement.
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
                Accès réservé au personnel autorisé. Toutes les connexions sont enregistrées.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>

</body>
</html>
