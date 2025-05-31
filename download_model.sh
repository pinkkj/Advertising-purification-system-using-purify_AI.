#!/bin/bash

FILE_ID="1TEtG29DJKl5wTJwtcm4OHNdc_mP27eim"
FILE_NAME="best_overall_convnext_model_2.pt"

echo "📥 모델 다운로드 시작..."

# 쿠키 기반 confirm 코드 추출 + 다운로드
curl -sc /tmp/cookie "https://drive.google.com/uc?export=download&id=${FILE_ID}" > /dev/null
CONFIRM_CODE=$(awk '/_warning_/ {print $NF}' /tmp/cookie)
curl -Lb /tmp/cookie "https://drive.google.com/uc?export=download&confirm=${CONFIRM_CODE}&id=${FILE_ID}" -o "${FILE_NAME}"

echo "✅ 모델 다운로드 완료: ${FILE_NAME}"
