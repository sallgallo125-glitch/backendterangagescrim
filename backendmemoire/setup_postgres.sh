#!/bin/bash
# Script d'installation et de configuration de PostgreSQL pour Teranga GESCRIM
# Exécuter avec : sudo bash setup_postgres.sh

set -e

echo "=========================================="
echo " Teranga GESCRIM — Setup PostgreSQL"
echo "=========================================="

# 1. Installer PostgreSQL
echo "[1/4] Installation de PostgreSQL..."
apt-get update -q
apt-get install -y postgresql postgresql-contrib

# 2. Démarrer le service
echo "[2/4] Démarrage du service PostgreSQL..."
systemctl start postgresql
systemctl enable postgresql

# 3. Créer l'utilisateur et la base de données
echo "[3/4] Création de la base de données teranga_gescrim..."
sudo -u postgres psql <<EOF
-- Créer l'utilisateur si n'existe pas
DO \$\$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'postgres') THEN
    CREATE USER postgres WITH PASSWORD 'postgres';
  END IF;
END
\$\$;

-- Mettre à jour le mot de passe
ALTER USER postgres WITH PASSWORD 'postgres';

-- Créer la base de données
SELECT 'CREATE DATABASE teranga_gescrim'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'teranga_gescrim')\gexec

-- Donner les droits
GRANT ALL PRIVILEGES ON DATABASE teranga_gescrim TO postgres;
EOF

echo "[4/4] Configuration terminée !"
echo ""
echo "Informations de connexion :"
echo "  Host     : 127.0.0.1"
echo "  Port     : 5432"
echo "  Database : teranga_gescrim"
echo "  Username : postgres"
echo "  Password : postgres"
echo ""
echo "Lancez maintenant :"
echo "  cd $(dirname "$0")"
echo "  php artisan migrate"
echo "  php artisan db:seed"
echo "  php artisan serve"
