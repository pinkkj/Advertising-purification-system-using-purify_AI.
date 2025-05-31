from flask import Flask, request, jsonify
from flask_cors import CORS
import io
import torch
from torchvision import transforms
from model import load_convnext_model
import os
from datetime import datetime
import cv2
import numpy as np
from PIL import Image, ImageEnhance

SAVE_DIR = 'saved_ads'
os.makedirs(SAVE_DIR, exist_ok=True)

app = Flask(__name__)
CORS(app)

# 등급 변환 매핑
reverse_exp_map = {0: 1, 1: 2, 2: 3, 3: 0}  # 노출: 1~3
reverse_sex_map = {0: 0, 1: 2, 2: 3, 3: 0}  # 성행위: 0, 2, 3

# 모델 로드
model = load_convnext_model('best_overall_convnext_model_2.pt')
model.eval()

# 이미지 전처리
transform = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor()
])

@app.route('/predict', methods=['POST'])
def predict():
    try:
        # 이미지 읽기
        image_bytes = request.files['image'].read()
        original_image = Image.open(io.BytesIO(image_bytes)).convert('RGB')
        enhancer = ImageEnhance.Brightness(original_image)
        bright_image = enhancer.enhance(15)  # 1.3배 밝기
        # 저장용 타임스탬프
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S_%f')

        # 모델 입력 전처리
        input_tensor = transform(bright_image).unsqueeze(0)

        # 예측 수행
        with torch.no_grad():
            out_exp, out_sex = model(input_tensor)
            exp_pred = torch.argmax(out_exp, dim=1).item()
            sex_pred = torch.argmax(out_sex, dim=1).item()

        # 등급 매핑
        exposure_score = reverse_exp_map[exp_pred]
        sexual_score = reverse_sex_map[sex_pred]
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S_%f')
        bright_filename = f'{timestamp}_노출{exposure_score}_성행위{sexual_score}.png'

        # 결과 반환
        return jsonify({
            'exposure': exposure_score,
            'sexual': sexual_score,
        })

    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
