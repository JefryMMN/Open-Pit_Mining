import os
import cv2
import numpy as np
import torch
from torch.utils.data import Dataset, DataLoader
import segmentation_models_pytorch as smp
from tqdm import tqdm

IMG_SIZE = 256
BATCH_SIZE = 4
EPOCHS = 30
DEVICE = "cuda" if torch.cuda.is_available() else "cpu"

TRAIN_IMG_DIR = "dataset/train/images"
TRAIN_MASK_DIR = "dataset/train/masks"
VAL_IMG_DIR = "dataset/val/images"
VAL_MASK_DIR = "dataset/val/masks"

class MineDataset(Dataset):
    def __init__(self, img_dir, mask_dir):
        self.img_dir = img_dir
        self.mask_dir = mask_dir
        self.images = os.listdir(img_dir)

    def __len__(self):
        return len(self.images)

    def __getitem__(self, idx):
        img_name = self.images[idx]

        img_path = os.path.join(self.img_dir, img_name)
        mask_path = os.path.join(self.mask_dir, img_name)

        image = cv2.imread(img_path)
        image = cv2.resize(image, (IMG_SIZE, IMG_SIZE))
        image = image / 255.0
        image = np.transpose(image, (2, 0, 1)).astype(np.float32)

        mask = cv2.imread(mask_path, cv2.IMREAD_GRAYSCALE)
        mask = cv2.resize(mask, (IMG_SIZE, IMG_SIZE))
        mask = mask / 255.0
        mask = np.expand_dims(mask, axis=0).astype(np.float32)

        return torch.tensor(image), torch.tensor(mask)

train_dataset = MineDataset(TRAIN_IMG_DIR, TRAIN_MASK_DIR)
val_dataset = MineDataset(VAL_IMG_DIR, VAL_MASK_DIR)

train_loader = DataLoader(train_dataset, batch_size=BATCH_SIZE, shuffle=True)
val_loader = DataLoader(val_dataset, batch_size=BATCH_SIZE, shuffle=False)

model = smp.Unet(
    encoder_name="resnet50",
    encoder_weights="imagenet",
    in_channels=3,
    classes=1,
).to(DEVICE)

loss_fn = torch.nn.BCEWithLogitsLoss()
optimizer = torch.optim.Adam(model.parameters(), lr=1e-4)

for epoch in range(EPOCHS):
    model.train()
    train_loss = 0

    for images, masks in tqdm(train_loader):
        images, masks = images.to(DEVICE), masks.to(DEVICE)

        preds = model(images)
        loss = loss_fn(preds, masks)

        optimizer.zero_grad()
        loss.backward()
        optimizer.step()

        train_loss += loss.item()

    print(f"Epoch [{epoch+1}/{EPOCHS}], Loss: {train_loss/len(train_loader):.4f}")

torch.save(model.state_dict(), "mine_unet_model.pth")
print("Model Saved Successfully!")