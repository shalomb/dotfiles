#!/bin/bash
set -e

# Custom Helm installer
echo "Installing Helm via custom script..."

# Download and install Helm
curl -fsSL -o get_helm.sh https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3
chmod 700 get_helm.sh
./get_helm.sh
rm get_helm.sh

echo "✓ Helm installed successfully"
