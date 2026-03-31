import os
import cv2
import torch
import numpy as np
import matplotlib.pyplot as plt
import segmentation_models_pytorch as smp

IMG_SIZE = 256
DEVICE = "cuda" if torch.cuda.is_available() else "cpu"
MODEL_PATH = "mine_unet_model.pth"
IMAGE_PATH = "dataset/test/003.png"

model = smp.Unet(
    encoder_name="resnet50",
    encoder_weights=None,
    in_channels=3,
    classes=1,
).to(DEVICE)

model.load_state_dict(torch.load(MODEL_PATH, map_location=DEVICE))
model.eval()

print("Model loaded successfully!")

def predict_image(img_path):
    if not os.path.exists(img_path):
        print(f"Image not found: {img_path}")
        return None

    image = cv2.imread(img_path)
    if image is None:
        print("Error reading image.")
        return None

    orig = image.copy()

    image = cv2.resize(image, (IMG_SIZE, IMG_SIZE))
    image = image.astype(np.float32) / 255.0
    image = np.transpose(image, (2, 0, 1))
    image = np.expand_dims(image, axis=0)
    image = torch.tensor(image).to(DEVICE)

    with torch.no_grad():
        pred = model(image)
        pred = torch.sigmoid(pred)
        pred = pred.squeeze().cpu().numpy()

    mask = (pred > 0.5).astype(np.uint8)

    mask = cv2.GaussianBlur(mask.astype(np.float32), (5,5), 0)
    mask = (mask > 0.5).astype(np.uint8)

    mask = cv2.resize(mask, (orig.shape[1], orig.shape[0]))

    return orig, mask

result = predict_image(IMAGE_PATH)

if result is not None:
    orig, mask = result

    plt.figure(figsize=(12,4))

    plt.subplot(1,3,1)
    plt.title("Original Image")
    plt.imshow(cv2.cvtColor(orig, cv2.COLOR_BGR2RGB))
    plt.axis("off")

    plt.subplot(1,3,2)
    plt.title("Predicted Mask")
    plt.imshow(mask, cmap='gray')
    plt.axis("off")

    overlay = orig.copy()
    overlay[mask == 1] = [255, 0, 0]

    plt.subplot(1,3,3)
    plt.title("Mine Areas Highlighted")
    plt.imshow(cv2.cvtColor(overlay, cv2.COLOR_BGR2RGB))
    plt.axis("off")

    plt.tight_layout()
    plt.show()