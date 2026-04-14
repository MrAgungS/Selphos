CREATE TABLE users (
 id binary(16) primary key,
 email varchar(255) unique,
 name varchar(100),
 password text,
 role enum('admin','user') default 'user',
 created_at timestamp default current_timestamp
)

create TABLE files (
 id binary(16) primary key,
 user_id binary(16) not null,
 current_version_id binary(16),
 is_deleted BOOLEAN DEFAULT FALSE,
 created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
 updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
 FOREIGN KEY (user_id) REFERENCES users(id)
)

CREATE TABLE file_versions (
 id binary(16) primary key,
 file_id binary(16) not null,
 bucket varchar(100) not null,
 object_key varchar(255) not null,
 compressed_object_key VARCHAR(255) NULL,
 compression_status ENUM('pending','processing','done','failed','skipped') NOT NULL DEFAULT 'pending' ,
 filename varchar(255),
 mime_type varchar(100),
 size bigint,
 etag varchar(255),
 created_at timestamp default current_timestamp,
 foreign key (file_id) references files(id)
)

CREATE TABLE uploads (
 id BINARY(16) PRIMARY KEY,
 user_id BINARY(16) NOT NULL,
 file_id BINARY(16),
 object_key VARCHAR(255) NOT NULL,
 bucket VARCHAR(100) NOT NULL,
 status ENUM('INITIATED','UPLOADING','COMPLETED','FAILED') DEFAULT 'INITIATED',
 expires_at TIMESTAMP,
 created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY (file_id) REFERENCES files(id)
);

CREATE TABLE file_access (
 id BINARY(16) PRIMARY KEY,
 file_id BINARY(16) NOT NULL,
 user_id BINARY(16),
 is_public BOOLEAN DEFAULT FALSE,
 permission ENUM('READ','WRITE','OWNER') DEFAULT 'READ',
 created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY (file_id) REFERENCES files(id)
);
