# download_model.sh
#!/bin/bash

FILE_ID="1TEtG29DJKl5wTJwtcm4OHNdc_mP27eim"
FILE_NAME="best_overall_convnext_model_2.pt"

echo "📥 모델 다운로드 시작..."
curl -c ./cookie -s -L "https://drive.google.com/uc?export=download&id=${FILE_ID}" > temp.html
CONFIRM_CODE=$(grep -o 'confirm=[^&]*' temp.html | sed 's/confirm=//')
curl -Lb ./cookie "https://drive.google.com/uc?export=download&confirm=${CONFIRM_CODE}&id=${FILE_ID}" -o ${FILE_NAME}
rm temp.html cookie
echo "✅ 모델 다운로드 완료: ${FILE_NAME}"
