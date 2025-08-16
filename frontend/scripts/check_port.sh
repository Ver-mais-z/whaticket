#!/bin/bash

PORT=8080

echo "Verificando se a porta $PORT está em uso..."

# Verifica se a porta está em uso
if lsof -i :$PORT >/dev/null; then
    echo "Porta $PORT está em uso. Tentando liberar..."
    # Encontra e mata o processo que está usando a porta
    lsof -t -i :$PORT | xargs kill -9
    echo "Porta $PORT liberada."
else
    echo "Porta $PORT não está em uso."
fi
