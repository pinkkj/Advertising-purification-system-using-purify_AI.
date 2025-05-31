import torch
import torch.nn as nn
import timm

class ConvNeXtMultiTaskModel(nn.Module):
    def __init__(self, backbone_name='convnext_tiny'):
        super().__init__()
        self.backbone = timm.create_model(backbone_name, pretrained=False, num_classes=0)
        hidden_dim = self.backbone.num_features
        self.dropout = nn.Dropout(0.3)
        self.head_exposure = nn.Linear(hidden_dim, 4)  # 노출 등급: 3-class
        self.head_sexual = nn.Linear(hidden_dim, 4)    # 성행위 등급: 3-class

    def forward(self, x):
        features = self.backbone(x)
        features = self.dropout(features)
        out_exp = self.head_exposure(features) 
        out_sex = self.head_sexual(features)    
        return out_exp, out_sex

def load_convnext_model(path='best_overall_convnext_model_2.pt'):
    model = ConvNeXtMultiTaskModel()
    model.load_state_dict(torch.load(path, map_location=torch.device('cpu'), weights_only=False))  
    return model