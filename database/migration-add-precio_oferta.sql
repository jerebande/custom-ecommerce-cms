-- Agrega soporte para precio de oferta en productos
ALTER TABLE productos
ADD COLUMN precio_oferta DECIMAL(10,2) NULL AFTER precio;
