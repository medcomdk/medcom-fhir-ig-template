import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.net.URLConnection;
import java.net.URLStreamHandler;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;
import org.hl7.fhir.igtools.templates.Template;
import org.hl7.fhir.igtools.templates.TemplateManager;
import org.hl7.fhir.r5.context.ILoggingService;
import org.hl7.fhir.utilities.json.parser.JsonParser;
import org.hl7.fhir.utilities.npm.CIBuildClient;
import org.hl7.fhir.utilities.npm.FilesystemPackageCacheManager;
import org.hl7.fhir.utilities.npm.NpmPackage;

class LoadTemplate {
  public static void main(String[] args) throws Exception {
    Path source = Path.of(args[0]);
    Path directory = Path.of(args[1]);
    ByteArrayOutputStream bytes = new ByteArrayOutputStream();
    try (ZipOutputStream zip = new ZipOutputStream(bytes); var files = Files.walk(source)) {
      for (Path file : files.filter(Files::isRegularFile).toList()) {
        zip.putNextEntry(new ZipEntry("medcom-fhir-ig-template-master/" + source.relativize(file).toString().replace('\\', '/')));
        Files.copy(file, zip);
        zip.closeEntry();
      }
    }

    // Feed a GitHub-shaped archive through the Publisher's actual URL loader.
    // Publisher 2.3.4 looks up configuration at package/$root, while its ZIP
    // reader strips one package/ prefix. The companion config at
    // package/package/$root/config.json makes the inheritance merge work.
    URL.setURLStreamHandlerFactory(protocol -> "https".equals(protocol) ? new URLStreamHandler() {
      protected URLConnection openConnection(URL url) throws IOException {
        if (!url.toString().equals("https://github.com/medcomdk/medcom-fhir-ig-template/archive/master.zip")) {
          throw new IOException("Unexpected network request: " + url);
        }
        return new HttpURLConnection(url) {
          public void connect() {}
          public void disconnect() {}
          public boolean usingProxy() { return false; }
          public InputStream getInputStream() { return new ByteArrayInputStream(bytes.toByteArray()); }
        };
      }
    } : null);

    var cache = new FilesystemPackageCacheManager.Builder()
      .withCacheFolder(directory.resolve("cache").toString())
      .withCiBuildClient(new CIBuildClient() {
        public boolean isCurrent(String id, NpmPackage npm) { return true; }
      }).build();
    var logger = new ILoggingService() {
      public void logMessage(String message) {}
      public void logDebugMessage(LogCategory category, String message) {}
    };

    String localConfig = null;
    for (String mode : new String[]{"local", "github"}) {
      Path ig = directory.resolve(mode);
      Files.createDirectories(ig);
      String location = mode.equals("local") ? source.toString()
        : "https://github.com/medcomdk/medcom-fhir-ig-template/tree/master";
      Template template = new TemplateManager(cache, logger)
        .loadTemplate(location, ig.toString(), "medcom.fhir.dk.test", false, false, false);
      if (template.getConfig("ActorDefinition", "ProducerActor", true) == null) {
        throw new AssertionError(mode + " lost the inherited resource defaults");
      }
      if (!"scripts/medcom.xml".equals(template.config().asString("script"))) {
        throw new AssertionError(mode + " lost the MedCom script configuration");
      }
      if (!template.config().has("formats") || !template.config().has("extraTemplates")) {
        throw new AssertionError(mode + " lost inherited rendering settings");
      }
      String config = JsonParser.compose(template.config(), false);
      if (mode.equals("local")) localConfig = config;
      else if (!localConfig.equals(config)) throw new AssertionError("Local and GitHub configurations differ");
    }
    System.out.println("Local and GitHub template configurations match");
  }
}
