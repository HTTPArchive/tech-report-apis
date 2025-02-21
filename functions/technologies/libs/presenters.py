class Presenters:
  @staticmethod
  def technology(item):
    return {
      'technology': item['technology'],
      'category': item['category'],
      'description': item['description'],
      'icon': item['icon'],
      'origins': item['origins']
    }
