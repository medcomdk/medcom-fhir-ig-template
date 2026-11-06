<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform" xmlns:h="http://www.w3.org/1999/xhtml" exclude-result-prefixes="h">
  <xsl:output method="html" encoding="UTF-8" omit-xml-declaration="yes"/>
  <xsl:template match="@*|node()">
    <xsl:copy><xsl:apply-templates select="@*|node()"/></xsl:copy>
  </xsl:template>
  <!-- Emit HTML elements so empty carets retain end tags when parsed by browsers. -->
  <xsl:template match="h:*">
    <xsl:element name="{local-name()}"><xsl:apply-templates select="@*|node()"/></xsl:element>
  </xsl:template>
  <xsl:template match="h:li[h:a[@href='profiles.html']] | li[a[@href='profiles.html']]">
    <xsl:text>{% include medcom-profile-menu.html %}</xsl:text>
  </xsl:template>
</xsl:stylesheet>
