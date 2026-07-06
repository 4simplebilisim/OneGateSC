-- Kullanıcı yetkisi: Firma (tenant) erişim boyutu — kullanıcı birden fazla firmada işlem yapabilir
ALTER TYPE wms."UserScopeType" ADD VALUE IF NOT EXISTS 'COMPANY';
