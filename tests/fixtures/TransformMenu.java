import javax.xml.transform.TransformerFactory;
import javax.xml.transform.stream.StreamResult;
import javax.xml.transform.stream.StreamSource;

class TransformMenu {
  public static void main(String[] args) throws Exception {
    TransformerFactory.newInstance()
      .newTransformer(new StreamSource(args[0]))
      .transform(new StreamSource(args[1]), new StreamResult(System.out));
  }
}
