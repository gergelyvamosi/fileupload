./mvnw clean

./mvnw package -Dmaven.test.skip

export JAVA_HOME=/opt/jdk-17.0.6+10/
$JAVA_HOME/bin/java -jar target/fileupload-0.0.1-SNAPSHOT.jar

