# Puxa o motor oficial e atualizado do Traccar
FROM traccar/traccar:latest

# Injeta a conexão com o seu banco de dados MySQL
COPY traccar.xml /opt/traccar/conf/traccar.xml

# Substitui a interface original pela sua interface personalizada
COPY web/ /opt/traccar/web/